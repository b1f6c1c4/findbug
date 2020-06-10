#pragma once

#include <utility>
#include <exception>
#include <string>
#include <sstream>
#include <type_traits>
#include <tuple>
#include <vector>

template <typename ... Iters>
class zipped_iter
{
public:
	zipped_iter(std::tuple<Iters ...> its) : _it(its) { }

	decltype(auto) operator++()
	{
		std::apply([](auto & ... x){std::make_tuple(++x ...);}, _it);
		return *this;
	}
	decltype(auto) operator++(int)
	{
		return zipped_iter(std::apply([](auto & ... x){return std::make_tuple(x++ ...);}, _it));
	}
	decltype(auto) operator*()
	{
		return std::apply([](auto & ... x){return std::tie(*x ...);}, _it);
	}
	auto operator==(const zipped_iter<Iters ...> &other)
	{
		return std::get<0>(_it) == std::get<0>(other._it);
	}
	auto operator!=(const zipped_iter<Iters ...> &other)
	{
		return !(operator==(other));
	}

private:
	std::tuple<Iters ...> _it;
};

template <typename Container>
struct iterator_helper
{
	typedef typename Container::iterator iterator;
};

template <typename Container>
struct iterator_helper<const Container>
{
	typedef typename Container::const_iterator iterator;
};

template <typename ... Containers>
class zipped
{
public:
	zipped(Containers & ... cs) : _cs(cs ...) { }

	decltype(auto) begin()
	{
		return zipped_iter<typename iterator_helper<Containers>::iterator ...>(
				std::apply([](auto & ... x){return std::make_tuple(x.begin() ...);}, _cs));
	}

	decltype(auto) end()
	{
		return zipped_iter<typename iterator_helper<Containers>::iterator ...>(
				std::apply([](auto & ... x){return std::make_tuple(x.end() ...);}, _cs));
	}

private:
	std::tuple<Containers & ...> _cs;
};

template <typename ... Containers>
auto zip(Containers & ... cs)
{
	return zipped<Containers ...>(cs ...);
}
